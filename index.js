import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import cron from 'node-cron';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

async function generateAndPublish() {
  console.log(`🚀 Auto-generating content at ${new Date().toLocaleString()}`);
  
  try {
    const topics = [
      'Best free AI productivity tools for 2025',
      'Open source alternatives to expensive software',
      'AI automation tools for small businesses',
      'Free online tools for content creators',
      'Productivity hacks using AI technology'
    ];
    
    const topic = topics[Math.floor(Math.random() * topics.length)];
    
    const prompt = `Create a blog post about "${topic}". Return JSON:
{
  "title": "SEO title",
  "content": "Markdown content with ## headings and examples",
  "tags": ["productivity", "ai", "tools", "free"],
  "excerpt": "Brief SEO description"
}`;

    console.log('🤖 Generating:', topic);
    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    const post = JSON.parse(text);
    console.log('✅ Generated:', post.title);
    
    // Create Jekyll post
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0];
    const slug = post.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const filename = `${dateStr}-${slug}.md`;
    
    const jekyllPost = `---
layout: post
title: "${post.title}"
date: ${date.toISOString()}
categories: [${post.tags.join(', ')}]
tags: [${post.tags.join(', ')}]
excerpt: "${post.excerpt}"
---

# ${post.title}

${post.content}

---

## Related Links
- [More Tools](${process.env.SITE_BASE_URL || 'https://quicktoolify.com'})
- [AI Resources](${process.env.SITE_BASE_URL || 'https://quicktoolify.com'}/blog)

*Auto-generated content for productivity enthusiasts.*`;

    // Save to GitHub Pages structure
    await fs.mkdir('./github-pages/_posts', { recursive: true });
    await fs.writeFile(`./github-pages/_posts/${filename}`, jekyllPost);
    
    console.log('📝 Saved:', filename);
    
    // Try GitHub API publish
    if (process.env.GITHUB_TOKEN && process.env.GITHUB_USERNAME && process.env.GITHUB_REPO) {
      try {
        const githubAPI = `https://api.github.com/repos/${process.env.GITHUB_USERNAME}/${process.env.GITHUB_REPO}/contents/_posts/${filename}`;
        
        const response = await fetch(githubAPI, {
          method: 'PUT',
          headers: {
            'Authorization': `token ${process.env.GITHUB_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: `Auto-post: ${post.title}`,
            content: Buffer.from(jekyllPost).toString('base64')
          })
        });
        
        if (response.ok) {
          console.log('✅ Published to GitHub Pages!');
        } else {
          console.log('💾 Saved locally (GitHub API failed)');
        }
      } catch (error) {
        console.log('💾 Saved locally (GitHub error)');
      }
    } else {
      console.log('💾 Saved locally (no GitHub config)');
    }
    
    console.log('🎉 Content generation complete!\n');
    
  } catch (error) {
    console.log('❌ Generation failed:', error.message);
  }
}

// Schedule at peak hours (9 AM and 8 PM)
console.log('🤖 GitHub Pages Auto-Publisher Started');
console.log('⏰ Scheduled: 9 AM and 8 PM daily');
console.log('🎯 Publishing to: GitHub Pages (FREE + Dofollow backlinks)');

cron.schedule('0 9 * * *', generateAndPublish);
cron.schedule('0 20 * * *', generateAndPublish);

// Run once immediately if started manually
if (process.argv.includes('--run-now')) {
  generateAndPublish();
} else {
  console.log('✨ Bot running... Use "npm start -- --run-now" to generate now');
}