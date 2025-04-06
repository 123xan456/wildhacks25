import requests
from bs4 import BeautifulSoup
from typing import List
from urllib.parse import urlparse

def get_site_type(base_url: str) -> str:
    domain = urlparse(base_url).netloc
    if 'fox' in domain:
        return 'fox'
    elif 'guardian' in domain:
        return 'guardian'
    elif 'cnn' in domain:
        return 'cnn'

def scrape_site(base_url: str, keywords: List[str]):
    """Scrape individual site with error handling"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(base_url, headers=headers, timeout=10)
        response.raise_for_status()        
        soup = BeautifulSoup(response.text, 'html.parser')
        site_type = get_site_type(base_url)
        headline_elements = []
        if site_type == 'fox':
            all_headers = soup.find_all('header', class_='info-header')
            valid_headers = []
            for header in all_headers:
                title_tag = header.find(['h2', 'h3'], class_='title')
                if title_tag and title_tag.find('a'):
                    valid_headers.append(header)
            headline_elements = valid_headers[:4]
        elif site_type == 'guardian':
            headline_elements = soup.find_all('a', class_='dcr-2yd10d')[:3]
        elif site_type == 'cnn':
            headline_elements = soup.find_all(['span'], 
                class_=lambda x: x and 'headline' in x.lower())[:3]
        else:
            return {base_url: []}

        matching_headlines = []

        for element in headline_elements:
            try:
                title, url = '', ''
                if site_type == 'fox':
                    title_tag = element.find(['h2', 'h3'], class_='title')
                    if title_tag:
                        a_tag = title_tag.find('a')
                        if a_tag:
                            url = a_tag.get('href', '')
                            title = a_tag.get_text(strip=True)
                elif site_type == 'guardian':
                    url = element.get('href', '')
                    title = element.get('aria-label', '')  
                elif site_type == 'cnn':
                    title = element.get_text(strip=True)
                    parent_a = element.find_parent('a')
                    url = element.get('href', '') if element.name == 'a' else (parent_a.get('href', '') if parent_a else '')

                # Validate and normalize URL
                if url and not url.startswith('http'):
                    url = requests.compat.urljoin(base_url, url)
                
                if title and url and any(kw.lower() in title.lower() for kw in keywords):
                    first_paragraph = ""
                    if site_type == 'cnn':
                        try:
                            article_response = requests.get(url, headers=headers, timeout=5)
                            article_response.raise_for_status()
                            article_soup = BeautifulSoup(article_response.text, 'html.parser')
                            
                            content_div = article_soup.find('div', class_='article__content')
                            if content_div:
                                first_p = content_div.find('p')
                                first_paragraph = first_p.get_text(strip=True) if first_p else ""
                        except Exception as e:
                            print(f"Error fetching CNN article content: {str(e)}")
                            first_paragraph = "[Content unavailable]"
                    
                    if site_type == 'guardian':
                        try:
                            article_response = requests.get(url, headers=headers, timeout=5)
                            article_response.raise_for_status()
                            article_soup = BeautifulSoup(article_response.text, 'html.parser')
                            
                            content_div = article_soup.find('div', class_='article-body-commercial-selector article-body-viewer-selector dcr-11jq3zt')
                            if content_div:
                                first_p = content_div.find('p')
                                first_paragraph = first_p.get_text(strip=True) if first_p else ""
                        except Exception as e:
                            print(f"Error fetching guardian article content: {str(e)}")
                            first_paragraph = "[Content unavailable]"
                    
                    if site_type == 'fox':
                        try:
                            article_response = requests.get(url, headers=headers, timeout=5)
                            article_response.raise_for_status()
                            article_soup = BeautifulSoup(article_response.text, 'html.parser')
                            
                            content_div = article_soup.find('div', class_='article-body')
                            if content_div:
                                first_p = content_div.find('p')
                                first_paragraph = first_p.get_text(strip=True) if first_p else ""
                        except Exception as e:
                            print(f"Error fetching foxnews article content: {str(e)}")
                            first_paragraph = "[Content unavailable]"
                    
                    
                    matching_headlines.append({
                        'title': title,
                        'url': url,
                        'first_paragraph': first_paragraph
                    })
                             
            except Exception as e:
                continue

        return {base_url: matching_headlines}
    
    except Exception as e:
        return {base_url: f"Error: {str(e)}"}

def scrape_news_endpoint(keywords):
    """Scrape all specified sites simultaneously"""
    cnn_scrape_res = scrape_site("https://www.cnn.com/business/investing", keywords)
    guardian_scrape_res = scrape_site("https://www.theguardian.com/us/business", keywords)
    fox_scrape_res = scrape_site("https://www.foxbusiness.com/", keywords)
    aggregated = cnn_scrape_res | guardian_scrape_res
    aggregated = aggregated | fox_scrape_res
    
    for _, articles in aggregated:
        res = ""
        count = 1
        for article in articles:
            res = res + f"Article {str(count)} title: {article['title']}\n"
            res = res + f"Article {str(count)} summary: {article['first_paragraph']}\n \n"
            count += 1
            
    return aggregated
    
if __name__=="__main__":
    print(scrape_site("https://www.cnn.com/business/investing", ["tariff"]))
    print(scrape_site("https://www.theguardian.com/us/business", ["tariff"]))
    print(scrape_site("https://www.foxbusiness.com/", ["tariff"]))