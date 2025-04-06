# wildhacks25
Libraries and Frameworks:
- React
- Flask
- MongoDB
- Gemini API
- BeautifulSoup
- Polygon API

## Inspiration
As people who invest, we find that it is difficult to make informed decisions about stocks, especially since we have limited expertise and don't always understand how recent events impact different stocks. With that in mind, we wanted to develop a solution for those in similar positions, so that they are able to make the the best decisions for their portfolio.

## What it does
Our site assists people in the stock market with making informed decisions by providing them with a detailed analysis of stocks they are interested in, as well as insight of how recent events may impact that stock. We aggregate this information from various news sites across the political spectrum for maximum fairness. We also provide users with our sources in order to ensure that users have agency with their decision making process.

## How we built it
Our solution handles simple user on-boarding and login with React and a MongoDB database. In addition, users indicate which stocks they are interested in, and we use Polygon to provide them with historical trends of those stocks.

Then, we use Gemini to generate 50 key words related to each stock. Using these keywords, we scrape different news sites to find articles containing those keywords, and generate individual predictions (positive, negative, neutral) for the stock based on the scraped articles. Finally, we aggregate these predictions and generate a final conclusion of the predicted trends along with the reasoning.