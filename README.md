General:  
- Your site should achieve at least 90% on the `Performance`, `Best Practices`, `Accessibility`, and `SEO` tests 
using Google [Lighthouse](https://developers.google.com/web/tools/lighthouse) (don't worry about the PWA test, and don't worry about scores for mobile devices).
Test early and often so that fixing problems doesn't lead to suffering at the end of the assignment. 



*Technical*
- (5 points) Get 100% (not 98%, not 99%, but 100%) in all four lighthouse tests required for this assignment.
- (up to 5 points) List up to five Express middleware packages you used and a short (one sentence) summary of what each one does. THESE MUST BE SEPARATE PACKAGES THAT YOU INSTALL VIA NPM, NOT THE ONES INCLUDED WITH EXPRESS. So express.json and express.static don't count here. For a starting point on middleware, see [this list](https://expressjs.com/en/resources/middleware.html).

*Design/UX*
- (5 points) Describe how your site uses the CRAP principles in the Non-Designer's Design Book readings. 
Which element received the most emphasis (contrast) on each page? 
How did you use proximity to organize the visual information on your page? 
What design elements (colors, fonts, layouts, etc.) did you use repeatedly throughout your site? 
How did you use alignment to organize information and/or increase contrast for particular elements. 
Write a paragraph of at least 125 words *for each of the four principles* (four paragraphs, 500 words in total).






## Slingshot Game

This application is a simple slingshot game. This game was made with matter.js and allows users to enter their scores to a personal leaderboard.

Link:

The most challenging part of creating this application was the authentication with GitHub. There were many small steps and errors which made the process confusing.

A link to your project running on render.

Include a very brief summary of your project here. Images are encouraged, along with concise, high-level text. Be sure to include:

- what CSS framework you used and why
  - include any modifications to the CSS framework you made via custom CSS you authored

## General
- **Server**: Created with Express. Manages user data in a table and a score board.
- **Results**: The user can see their data in a table.
- **Form/Entry**: Users can add, modify, and delete score entries.

## Technical Achievements
- **Tech Achievement 1**: I used OAuth authentication with passport.js and GitHub authentication. The user is directed to the game page after login. I chose session-based authentication because it is the most reliable for the user.

### Design/Evaluation Achievements
- **Design Achievement 1**: CRAP.
