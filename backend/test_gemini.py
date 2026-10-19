from google import genai
import os

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)

prompt = """
You are Ledgerly's financial insights assistant.

Analyze these financial figures:
Monthly income: ₹25,000
Monthly expenses: ₹18,000
Monthly savings: ₹7,000

Explain:
1. How much money remains.
2. What percentage of income was saved.
3. One practical budgeting suggestion.

Use simple English. Do not invent financial figures.
"""

response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=prompt
)

print(response.text)