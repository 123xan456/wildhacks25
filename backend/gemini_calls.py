#%%
import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
import pandas as pd
from dotenv import load_dotenv
import scrape_articles

load_dotenv()

MY_ENV_VAR = os.getenv("api_key")

#%%
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
#%%
# stock placeholder
stock = 'GOOGL'
model = model_setup()
#%%
def generate_key_words(stock):
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

    print(out)
    return out
#%%

def scrape_formatting():
  words = generate_key_words(stock)
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
#%%
# @app.route('/api/predict', methods=['GET'])
def individual_prediction(stock):
    #dictionary mapping source to prompt. groups of 5
    source_to_prompt, aggregated = scrape_formatting()
    results = {}
    final_input = ""
    count = 1

    for source, prompt in source_to_prompt.items():
      individual_prompt = f""" You are an expert in the stock market and are responsible for informing clients about the potential impact of recent events on a particular stock. 
                              Here are step by step examples of how to generate the prediction based on each source of information:
                              Example 1:
                              Article 1: Information: ​In the 2024 U.S. presidential election, former President Donald Trump defeated Vice President Kamala Harris, securing 312 electoral votes to Harris's 226. Trump also won the popular vote with 49.8% against Harris's 48.3%. This victory marked Trump's return to the White House for a non-consecutive second term. ​
                              Article 2: BYD has opened a $490 million EV factory in Thailand and is building a $1 billion plant in Indonesia, set to finish by end of 2025. Each factory will produce 150,000 vehicles annually, supporting BYD’s plan to double overseas sales to over 800,000 units by 2025.
                              Prediction: Trump’s return could boost U.S. manufacturing and deregulation, potentially favoring Tesla. However, BYD’s aggressive global expansion may intensify EV competition. Combined, Tesla’s stock may face short-term optimism from policy shifts but long-term pressure from rising international rivals like BYD, possibly resulting in increased volatility and mixed investor sentiment.

                              Example 2:
                              Article 1: In the second quarter of fiscal 2025, NVIDIA reported record revenue of $30.0 billion, a 122% year-over-year increase, surpassing analyst expectations. Earnings per share reached $0.67, up 168% from the previous year. This growth was driven by strong demand for AI-related products, particularly in data centers. ​
                              Article 2: President Trump, since his January 2025 inauguration, has implemented a range of new tariffs, although specific details fall after my October 2024 knowledge cutoff. Prior to leaving office in 2021, Trump was known for aggressive tariff policies, particularly targeting China, steel, aluminum, and various European goods. ​
                              Prediction: NVIDIA’s record-breaking Q2 performance, driven by AI demand, suggests strong upward momentum. However, Trump’s new tariffs could disrupt global supply chains and raise costs, especially if China is targeted. Despite potential trade tensions, NVIDIA’s dominance in AI may sustain investor confidence, keeping its stock resilient with possible short-term fluctuations.                            

                              Now it's your turn. Given the information, write a 50-word prediction as to how that might affect {stock} in the short term.
                              {prompt}"""
      response = model.invoke(individual_prompt).content
      sentiment = model.invoke(f'Based on the following prediction, indicate whether the prediction is Positive, Negative, or Neutral. ONLY provide the word.\n{response}').content
      results[source] = (response, sentiment)
      print(response)
      final_input += f'Prediction {count}: {response}\nSentiment {count}: {sentiment} \n'
      count += 1

    final_prediction = model.invoke(f'From all the information provided, provide a 50-word final prediction about whether you think the {stock} stock will rise, fall, or remain the same and why:\n{final_input}').content
    final_sentiment = model.invoke(f'Based on the following prediction, indicate whether the prediction is Positive, Negative, or Neutral. ONLY provide the word.\n{final_prediction}').content

    aggregated['individual_predictions'] = results
    aggregated['final_prediction'] = (final_prediction, final_sentiment)
    return aggregated

print(individual_prediction(stock))
# %%
