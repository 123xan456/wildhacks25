#%%
import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
import pandas as pd
#%%
gemini_api_key = "AIzaSyAtllq2cvGyrKkIQ43gJmVamDLPzxyTL_k"
def model_setup():
    if 'GOOGLE_API_KEY' not in os.environ:
      os.environ['GOOGLE_API_KEY'] = gemini_api_key

    print(os.environ['GOOGLE_API_KEY'])
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
def first_prompt(stock):
    response = model.invoke(f""" 
                            You are an expert in the stock market and are responsible for generating the five most relevant words to a given stock abbreviation.
                            Here are step by step examples of how to generate the key words:
                            Example 1: TSLA
                            'electric vehicle', 'car', 'Elon Musk', 'AI', 'autodrive'
                            Example 2: NVDA
                            'AI', 'GPU', 'technology', 'infrastructure', 'data'
                            Example 3: AMZN
                            'cloud', 'e-commerce', 'prime', 'marketplace', 'business'

                            Now it's your turn. give me 50 key words, and ONLY the key words. Example: {stock}
                            """)
    out = response.split(',')
    out.append(stock)

    return out
#%%

def individual_prediction(information, stock):
   # generating individual prediction
    individual_prompt = f""" You are an expert in the stock market and are responsible for informing clients about the potential impact of recent events on a particular stock. 
                            Here are step by step examples of how to generate the prediction:
                            Example 1: 
                            Information: ​In the 2024 U.S. presidential election, former President Donald Trump defeated Vice President Kamala Harris, securing 312 electoral votes to Harris's 226. Trump also won the popular vote with 49.8% against Harris's 48.3%. This victory marked Trump's return to the White House for a non-consecutive second term. ​
                            Prediction: With Donald Trump winning the 2024 election, Tesla (TSLA) stock may see short-term gains driven by investor expectations of deregulation and pro-business policies. However, Elon Musk’s visible political alignment could alienate some consumers, creating volatility. Market optimism may be tempered by concerns over demand and public perception of the brand.

                            Example 2:
                            Information: In the second quarter of fiscal 2025, NVIDIA reported record revenue of $30.0 billion, a 122% year-over-year increase, surpassing analyst expectations. Earnings per share reached $0.67, up 168% from the previous year. This growth was driven by strong demand for AI-related products, particularly in data centers. ​
                            Prediction: Following NVIDIA’s blowout earnings, with revenue and profit far exceeding expectations, NVDA stock is likely to surge in the short term. Investor confidence will be fueled by strong AI demand and record data center growth. Momentum traders may amplify gains, though some volatility could emerge from profit-taking after the rally.                            

                            Example 3: AMZN
                            Information: President Trump, since his January 2025 inauguration, has implemented a range of new tariffs, although specific details fall after my October 2024 knowledge cutoff. Prior to leaving office in 2021, Trump was known for aggressive tariff policies, particularly targeting China, steel, aluminum, and various European goods. ​
                            Prediction: Donald Trump's newly implemented tariffs could negatively impact Amazon stock in the short term due to potential disruptions in their global supply chain and increased costs of imported goods. Investors may react cautiously as margins could be squeezed, though Amazon's diverse business model and ability to adapt to regulatory changes might mitigate severe stock volatility.RetryClaude can make mistakes. Please double-check responses.

                            Now it's your turn. Given the information, write a 50-word prediction as to how that might affect {stock} in the short term. Example: {information}"""
    response = model.invoke(individual_prompt)
    sentiment = model.invoke(f'Based on the following prediction, indicate whether the prediction is Positive, Negative, or Neutral. ONLY provide the word.\n{response}')
    return response, sentiment
#%%
df = pd.DataFrame(columns = ['article_id', 'article_title', 'source', 'sentiment', 'summary_description', 'individual_prediction'])

# import data from web scraping

df[['individual_prediction', 'sentiment']] = df.apply(lambda row: pd.Series(individual_prediction(row['summary_description'], stock)), axis=1)
#%%
def summary_prediction():
   all_summaries = df['summary_description'].str.cat(sep='\n')

   summary_prediction = f"""You are an expert in the stock market and are responsible for informing clients about the potential impact of recent events on a particular stock. 
                            You are given predictions aggregated from different sources, and are responsible for creating a final conclusion of how this will impact the stock market.

                            Example 1: 
                            Individual Predictions:
                            With Donald Trump winning the 2024 election, Tesla (TSLA) stock may see short-term gains driven by investor expectations of deregulation and pro-business policies. However, Elon Musk’s visible political alignment could alienate some consumers, creating volatility. Market optimism may be tempered by concerns over demand and public perception of the brand.
                            Tesla stock likely to see positive movement following Trump's election victory, as his administration may ease EV regulatory requirements and environmental restrictions that Tesla has navigated effectively. However, potential reduction in EV tax credits and subsidies could create countervailing pressure. Trump's emphasis on American manufacturing could benefit Tesla's domestic operations while affecting its China strategy.
                            Final Prediction: 
                            Tesla stock will likely experience mixed but ultimately positive performance under Trump's presidency as the benefits of deregulation and domestic manufacturing emphasis outweigh the potential reduction in EV subsidies and changing consumer sentiment.RetryClaude can make mistakes. Please double-check responses.

                            Example 2:
                            Individual Predictions:
                            NVIDIA stock will likely surge on these exceptional Q2 2025 results, as the 122% revenue growth and 168% EPS increase validate its leadership position in the AI chip market. Continuing high demand for data center solutions should sustain investor confidence. While some profit-taking might occur given NVIDIA's already substantial valuation, the long-term growth trajectory appears solid amid ongoing AI acceleration.
                            Following NVIDIA’s blowout earnings, with revenue and profit far exceeding expectations, NVDA stock is likely to surge in the short term. Investor confidence will be fueled by strong AI demand and record data center growth. Momentum traders may amplify gains, though some volatility could emerge from profit-taking after the rally.                            
                            Final Prediction:
                            NVIDIA stock will experience strong upward momentum following its exceptional Q2 2025 results, though initial surge may face some volatility from profit-taking as investors balance the company's proven AI market dominance against its already premium valuation.RetryClaude can make mistakes. Please double-check responses.

                            Example 3:
                            Individual Predictions:
                            Amazon stock will likely experience short-term volatility due to Trump's new tariffs, particularly if they affect imported consumer goods or Chinese tech components. However, Amazon's extensive domestic infrastructure and ability to absorb supply chain disruptions may provide resilience compared to competitors with less robust U.S. operations.
                            Donald Trump's newly implemented tariffs could negatively impact Amazon stock in the short term due to potential disruptions in their global supply chain and increased costs of imported goods. Investors may react cautiously as margins could be squeezed, though Amazon's diverse business model and ability to adapt to regulatory changes might mitigate severe stock volatility.RetryClaude can make mistakes. Please double-check responses.
                            Final Prediction:
                            While Amazon stock may face initial volatility from Trump's new tariffs, its robust domestic infrastructure and supply chain adaptability position it to outperform competitors long-term, potentially creating a buying opportunity for informed investors.RetryClaude can make mistakes. Please double-check responses.

                            Now it's your turn. Given the information, write a one sentence conclusion as to how whether {stock} will rise, fall, or stay the same, and why:
                            {all_summaries}
                            Final Prediction:\n"""
   return model.invoke(summary_prediction)
# %%
