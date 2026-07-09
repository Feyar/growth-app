import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { question, content } = req.body

  if (!question && !content) {
    return res.status(400).json({ error: '请提供问题内容' })
  }

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return res.status(200).json({
      deepened: 'AI 深化功能尚未配置。请在 Vercel 项目设置中添加 OPENROUTER_API_KEY 环境变量。\n\n你也可以手动把问题记下来，配置好 API key 后再来深化。',
    })
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://github.com/Feyar/growth-app',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        messages: [
          {
            role: 'system',
            content:
              '你是一个技术深化助手。用户会提出一个工作中遇到的技术问题，你需要帮ta分析这个问题的深层原理、相关知识点、以及可以进一步探索的方向。回答要深入但不冗长，2-3段即可，用中文。',
          },
          { role: 'user', content: question || content },
        ],
      }),
    })

    const data = await response.json()
    const deepened = data.choices?.[0]?.message?.content || '未能获取深化分析'

    res.json({ deepened })
  } catch (error) {
    console.error('AI deepen error:', error)
    res.status(200).json({
      deepened: 'AI 服务暂时不可用，请稍后再试。',
    })
  }
}
