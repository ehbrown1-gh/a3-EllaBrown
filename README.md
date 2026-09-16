## Slingshot Game
This application is a simple slingshot game. This game was made with matter.js and allows users to enter their scores to a personal leaderboard.

Link: https://a3-ellabrown.onrender.com

The most challenging part of creating this application was the authentication with GitHub. There were many small steps and errors which made the process confusing.

##Lighthouse Scores
- **Performance**: 90
- **Best Practices**: 96
- **Accessibility**: 100
- **SEO**: 90

## General
- **Server**: Created with Express. Manages user data in a table and a score board.
- **Results**: The user can see their data in a table.
- **Form/Entry**: Users can add, modify, and delete score entries.
- **Data Storage**: Used MongoDB to aid with data storage.
- **CSS Framework*: NES.css to give the site a classic video game look.

## Technical Achievements
- **Tech Achievement 1**: I used OAuth authentication with passport.js and GitHub authentication. The user is directed to the game page after login. I chose session-based authentication because it is the most reliable for the user. The website also uses Cookies.

### Design/Evaluation Achievements
- **Design Achievement 1**: CRAP
Contrast
The main boxed elements of the webpage have a blue color so stand out against the background. A vanilla color was used so the table header could stand against the blue. The log out and delete buttons use a red color to indicate that the buttons will perform more intense actions. For the text, the title elements and buttons have the NES so the reader will notice and read them before the associated text. The associated text is a “normal” font so it is easier to read. The text has the most contrast on the pages. For the game, the restart button is a more striking blue so the user will immediately be aware of its function. This is important since the timer starts once the site is first loaded. For the game, the main ball and moving balls are different colors so the user can tell them apart during the round.

Repetition
Each element resides in a similarly formatted box. This allows each major element of the page to stand out from one another while maintaining a consistent look. All of the most important text share the same NES.css font while the smaller text has the Times New Roman font. Each element uses a rectangular shape and has a thick border to convey the boxy feel of NES games. The elements are spaced evenly so, upon seeing the site for the first time, the user reads from top to bottom without skipping important text. For the game, it follows the design which simple circular, rectangular, and octagonal shapes to maintain a simplistic look. Overall, the website maintains a unified interface, which aids both the artistic design and the functionality in regard to the user.

Alignment
The boxed elements have the same width and clean outline. This gives the website an organized look and allows the user to maintain the same viewpoint while scrolling through the page. The text begins on the left side so it remains aligned in the boxes. Buttons are positions next to explanatory text so their functionality is apparent. The game container has a smaller width than the other boxed elements so the user can clearly separate the game from the rest of the elements. The score, timer, and restart button are aligned in the center so they are easily visible during gameplay. Their positioning also identifies them as elements of the game. The table is centered in the box to convey its importance against the background.

Proximity
Just like old school games, the website should have a boxy, clean look. Grouping the elements with identical boxes with equal spacing in between conveys this aesthetic. The game rules are in proximity with the game itself while the score form, leaderboard, and score server data are in proximity. The log in message and log out button are in proximity with the title so the user views them first when entering the page. The table data is in proximity with the edit/delete buttons so the user can clearly view their data before they decide to alter it. The leaderboard is in proximity with the submit form so the user can decide if they want to submit their current score or try again with the game.
