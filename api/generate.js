import { GoogleGenerativeAI } from '@google/generative-ai';

// Fetch sitemap links
async function fetchSitemapLinks() {
  try {
    const response = await fetch('https://quicktoolify.com/sitemap.xml');
    const xml = await response.text();
    const urlMatches = xml.match(/<loc>(.*?)<\/loc>/g);
    return urlMatches ? urlMatches.map(match => 
      match.replace('<loc>', '').replace('</loc>', '')
    ).filter(url => url.includes('quicktoolify.com') && !url.includes('sitemap')) : [];
  } catch (error) {
    return ['https://quicktoolify.com/ai-tools', 'https://quicktoolify.com/productivity'];
  }
}

// Main generation function
export async function generateAndPublish() {
  console.log('🚀 Starting blog generation...');
  
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  
  // Get sitemap links
  const sitemapLinks = await fetchSitemapLinks();
  const randomLinks = sitemapLinks.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 5) + 3);
  
  // Generate topic
  const topicResult = await model.generateContent(`Generate a trending topic about ${process.env.NICHE_KEYWORDS} for 2025. Just return the title.`);
  const topic = topicResult.response.text().trim().replace(/['"]/g, '');
  
  // Generate content
  const contentPrompt = `Write a comprehensive 2000+ word blog post about "${topic}".
  
Structure:
- Engaging introduction
- 6-8 sections with ## headings  
- Bullet points and examples
- Strong conclusion
- Use markdown formatting
- Focus on free tools and productivity`;

  const contentResult = await model.generateContent(contentPrompt);
  const content = contentResult.response.text();
  
  // Create internal links
  const internalLinks = randomLinks.map(url => {
    const toolName = url.split('/').pop().replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    return `- [${toolName}](${url})`;
  }).join('\n');
  
  // Create Jekyll post
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0];
  const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const filename = `${dateStr}-${slug}.md`;
  
  const jekyllPost = `---
layout: post
title: "${topic}"
date: ${date.toISOString()}
categories: [productivity, ai-tools, automation]
tags: [${process.env.NICHE_KEYWORDS.split(',').map(k => k.trim()).join(', ')}]
excerpt: "Discover ${topic.toLowerCase()} with our comprehensive guide to free tools and productivity tips."
author: "QuickToolify Team"
---

<style>
  .post-content {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.7;
    color: #2d3748;
  }
  
  .post-content h2 {
    font-size: 1.75rem;
    border-bottom: 3px solid #667eea;
    padding-bottom: 0.5rem;
    color: #1a202c;
    font-weight: 700;
  }
  
  .highlight-box {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 1.5rem;
    border-radius: 10px;
    margin: 2rem 0;
  }
  
  .internal-links {
    background: #f8f9fa;
    border-left: 4px solid #667eea;
    padding: 1.5rem;
    margin: 2rem 0;
    border-radius: 0 8px 8px 0;
  }
</style>

<div class="post-content">

${content}

<div class="highlight-box">
  <h3>🚀 Ready to Boost Your Productivity?</h3>
  <p>The tools and strategies covered in this guide are just the beginning. For access to 100+ carefully curated free online tools, visit <strong>QuickToolify.com</strong> and transform your workflow today!</p>
</div>

<div class="internal-links">
  <h3>🔗 Explore More Free Tools</h3>
  <p>Discover additional productivity tools and resources:</p>
  
${internalLinks}
</div>

</div>

---

*Visit [QuickToolify.com](https://quicktoolify.com) for 100+ free online tools to boost your productivity!*`;

  // Publish to GitHub
  const githubAPI = `https://api.github.com/repos/${process.env.GITHUB_USERNAME}/${process.env.GITHUB_REPO}/contents/_posts/${filename}`;
  
  const response = await fetch(githubAPI, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${process.env.GITHUB_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: `Auto-publish: ${topic}`,
      content: Buffer.from(jekyllPost).toString('base64')
    })
  });
  
  if (response.ok) {
    console.log('✅ Published:', topic);
    return { success: true, topic, filename, links: randomLinks.length };
  } else {
    throw new Error('GitHub publish failed');
  }
}

// API endpoint for manual trigger
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const result = await generateAndPublish();
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
