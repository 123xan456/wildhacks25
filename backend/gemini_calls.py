#%%
import os
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv
import scrape_articles

load_dotenv()

MY_ENV_VAR = os.getenv("api_key")

def model_setup():
    if 'GOOGLE_API_KEY' not in os.environ:
      os.environ['GOOGLE_API_KEY'] = MY_ENV_VAR

    model = ChatGoogleGenerativeAI(
      model='gemini-1.5-flash',
      temperature=0,
      max_tokens=1000,
      timeout=None,
      max_retries=2,
    )

    return model
  
def generate_key_words(stock, model):
    response = model.invoke(f""" 
                            You are an expert in the stock market and are responsible for generating the 5 most relevant words to a given stock abbreviation. These keywords should be words that would appear in a news headline and should not be plural.
                            Here are step by step examples of how to generate the key words:
                            Example 1: TSLA
                            'electric', 'car', 'Elon Musk', 'AI', 'autodrive'
                            Example 2: NVDA
                            'AI', 'GPU', 'technology', 'infrastructure', 'data'
                            Example 3: AMZN
                            'cloud', 'e-commerce', 'prime', 'marketplace', 'business'

                            Now it's your turn. give me 5 key words, and ONLY the key words. Example: {stock}
                            """)
    response = response.content
    out = response.split(',')
    out.append('tariff')
    out.append(stock)
    return out
  
def scrape_formatting(stock, model):
  words = generate_key_words(stock, model)
  aggregated = scrape_articles.scrape_news(words)
  res = {}
  for source, articles in aggregated.items():
    formatted = ""
    count = 1
    for article in articles:
        formatted = formatted + f"Article {str(count)}: {article['first_paragraph']}\n"
        count += 1
    res[source] = formatted
  return res, aggregated