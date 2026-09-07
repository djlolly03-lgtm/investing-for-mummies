# Direct RSS feeds from Indian finance news sources — gives real article URLs
RSS_FEEDS = [
    ("Economic Times — Personal Finance", "https://economictimes.indiatimes.com/personal-finance/rssfeeds/1715249553.cms"),
    ("Economic Times — Mutual Funds",     "https://economictimes.indiatimes.com/mf/rssfeeds/13357270.cms"),
    ("Mint — Money",                      "https://www.livemint.com/rss/money"),
    ("Mint — Personal Finance",           "https://www.livemint.com/rss/personal-finance"),
    ("Moneycontrol — Personal Finance",   "https://www.moneycontrol.com/rss/personalfinance.xml"),
    ("CNBC TV18 — Personal Finance",      "https://www.cnbctv18.com/commonfeeds/v1/eng/rss/personal-finance.xml"),
    ("Zee Business",                       "https://www.zeebiz.com/rss/personal-finance.xml"),
]

RELEVANCE_TOPICS = """
- Mutual funds / SIP / SWP investing
- Stock market basics for beginners
- Personal finance and budgeting
- Savings and financial planning for families
- Women and money / financial independence
- Retirement planning in India
- Tax saving for individuals in India (ELSS, PPF, NPS)
- Understanding financial products (FDs, bonds, ETFs, gold)
- Managing debt and credit
"""

AUDIENCE = """Indian women who are beginners in personal finance and investing.
They may have limited financial literacy but are curious and eager to learn.
The tone should be warm, friendly, and jargon-free — like explaining to a trusted friend over chai.
Keep it practical and relatable. Use simple English and short sentences.
Avoid technical terms; if unavoidable, explain them immediately in plain language.
Examples should feel relevant to Indian family life — school fees, family budgets, planning for the future."""

MAX_ARTICLES_PER_SCAN = 5
MIN_RELEVANCE_SCORE = 6  # out of 10
