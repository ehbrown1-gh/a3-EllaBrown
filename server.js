require("dotenv").config();

const path = require("path");
const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const mongoose = require("mongoose");
const passport = require("passport");
const GitHubStrategy = require("passport-github2").Strategy;

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!MONGODB_URI || !SESSION_SECRET || !process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    console.error(
        "Missing required environment variables. Set MONGODB_URI, SESSION_SECRET, " +
        "GITHUB_CLIENT_ID, and GITHUB_CLIENT_SECRET."
    );
    process.exit(1);
}

mongoose.connect(MONGODB_URI)
    .then(() => console.log("Connected to MongoDB"))
    .catch((error) => {
        console.error("MongoDB connection failed:", error);
        process.exit(1);
    });

const scoreSchema = new mongoose.Schema(
    {
        githubId: { type: String, required: true, index: true },
        sessionId: { type: String, required: true, unique: true, index: true },
        name: { type: String, required: true, trim: true, maxlength: 40 },
        score: { type: Number, required: true, min: 0 },
        submittedAt: { type: Date, default: Date.now },
        scoreLevel: { type: String, required: true }
    },
    { versionKey: false }
);

const Score = mongoose.model("Score", scoreSchema);

passport.use(
    new GitHubStrategy(
        {
            clientID: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
            callbackURL: process.env.GITHUB_CALLBACK_URL || "http://localhost:3000/auth/github/callback"
        },
        (accessToken, refreshToken, profile, done) => {
            done(null, {
                githubId: String(profile.id),
                username: profile.username || profile.displayName || "GitHub User",
                displayName: profile.displayName || profile.username || "GitHub User"
            });
        }
    )
);

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

app.set("trust proxy", 1);
app.use(express.json({ limit: "10kb" }));

app.use(
    session({
        secret: SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({ mongoUrl: MONGODB_URI }),
        cookie: {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            maxAge: 1000 * 60 * 60 * 24
        }
    })
);

app.use(passport.initialize());
app.use(passport.session());

function requireAuth(req, res, next) {
    if (req.isAuthenticated()) return next();
    return res.status(401).json({ error: "You must log in with GitHub first." });
}

function scoreLevelFor(score) {
    if (score >= 200) return "Expert";
    if (score >= 100) return "Advanced";
    return "Beginner";
}

function cleanName(value) {
    return String(value || "").trim().slice(0, 40);
}

function cleanScore(value) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0 || !Number.isInteger(number)) {
        return null;
    }
    return number;
}

app.get("/", (req, res) => {
    if (req.isAuthenticated()) return res.redirect("/game");
    res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/game", requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use(express.static(path.join(__dirname, "public"), { index: false }));

app.get("/auth/github", passport.authenticate("github", { scope: ["user:email"] }));

app.get(
    "/auth/github/callback",
    passport.authenticate("github", { failureRedirect: "/" }),
    (req, res) => {
        req.session.regenerate((error) => {
            if (error) {
                console.error("Session regeneration failed:", error);
                return res.redirect("/");
            }

            // Passport is reattached after regeneration.
            req.login(req.user, (loginError) => {
                if (loginError) {
                    console.error("Login failed:", loginError);
                    return res.redirect("/");
                }
                res.redirect("/game");
            });
        });
    }
);

app.post("/auth/logout", (req, res, next) => {
    req.logout((logoutError) => {
        if (logoutError) return next(logoutError);

        req.session.destroy((sessionError) => {
            if (sessionError) return next(sessionError);
            res.clearCookie("connect.sid");
            res.redirect("/");
        });
    });
});

app.get("/api/me", requireAuth, async (req, res) => {
    try {
        const submitted = await Score.exists({ sessionId: req.sessionID });
        res.json({
            username: req.user.username,
            displayName: req.user.displayName,
            submittedThisSession: Boolean(submitted)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Could not load account information." });
    }
});

// IMPORTANT: every query is scoped to the authenticated GitHub account.
// The browser never supplies githubId as an ownership field.
app.get("/api/data", requireAuth, async (req, res) => {
    try {
        const rows = await Score.find({ githubId: req.user.githubId })
            .sort({ score: -1, submittedAt: -1 })
            .lean();
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Could not load your scores." });
    }
});

// A login session can create at most one score.
// sessionId is server-controlled and has a unique MongoDB index.
app.post("/api/data", requireAuth, async (req, res) => {
    try {
        const name = cleanName(req.body.name);
        const score = cleanScore(req.body.score);

        if (!name) return res.status(400).json({ error: "Name is required." });
        if (score === null) {
            return res.status(400).json({ error: "Score must be a non-negative whole number." });
        }

        const existing = await Score.exists({ sessionId: req.sessionID });
        if (existing) {
            return res.status(409).json({
                error: "You have already submitted a score during this login session."
            });
        }

        await Score.create({
            githubId: req.user.githubId,
            sessionId: req.sessionID,
            name,
            score,
            scoreLevel: scoreLevelFor(score)
        });

        const rows = await Score.find({ githubId: req.user.githubId })
            .sort({ score: -1, submittedAt: -1 })
            .lean();

        res.status(201).json(rows);
    } catch (error) {
        // Handles two simultaneous POST requests from the same session.
        if (error && error.code === 11000 && error.keyPattern && error.keyPattern.sessionId) {
            return res.status(409).json({
                error: "You have already submitted a score during this login session."
            });
        }

        console.error(error);
        res.status(500).json({ error: "Could not save your score." });
    }
});

app.put("/api/data/:id", requireAuth, async (req, res) => {
    try {
        const name = cleanName(req.body.name);
        const score = cleanScore(req.body.score);

        if (!name) return res.status(400).json({ error: "Name is required." });
        if (score === null) {
            return res.status(400).json({ error: "Score must be a non-negative whole number." });
        }

        const updated = await Score.findOneAndUpdate(
            { _id: req.params.id, githubId: req.user.githubId },
            {
                $set: {
                    name,
                    score,
                    scoreLevel: scoreLevelFor(score)
                }
            },
            { new: true, runValidators: true }
        ).lean();

        if (!updated) return res.status(404).json({ error: "Your entry was not found." });

        const rows = await Score.find({ githubId: req.user.githubId })
            .sort({ score: -1, submittedAt: -1 })
            .lean();

        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Could not update your score." });
    }
});

app.delete("/api/data/:id", requireAuth, async (req, res) => {
    try {
        const deleted = await Score.findOneAndDelete({
            _id: req.params.id,
            githubId: req.user.githubId
        });

        if (!deleted) return res.status(404).json({ error: "Your entry was not found." });

        const rows = await Score.find({ githubId: req.user.githubId })
            .sort({ score: -1, submittedAt: -1 })
            .lean();

        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Could not delete your score." });
    }
});

app.listen(PORT, () => {
    console.log(`Slingshot server running on http://localhost:${PORT}`);
});
