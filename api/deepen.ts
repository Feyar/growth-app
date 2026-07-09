import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { question, content } = req.body

  if (!question && !content) {
    return res.status(400).json({ error: '请提供问题内容' })
  }

  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    return res.status(200).json({
      deepened: 'AI 深化功能尚未配置。请在 Vercel 项目设置中添加 DEEPSEEK_API_KEY 环境变量。',
    })
  }

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-v4-flash',
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

    if (!response.ok) {
      console.error('DeepSeek API error:', response.status, JSON.stringify(data))
      return res.status(200).json({
        deepened: `AI 服务返回错误 (${response.status})，请稍后再试。`,
      })
    }

    const deepened = data.choices?.[0]?.message?.content
    if (!deepened) {
      console.error('Unexpected DeepSeek response:', JSON.stringify(data))
      return res.status(200).json({
        deepened: 'AI 返回格式异常，请稍后再试。',
      })
    }

    res.json({ deepened })
  } catch (error) {
    console.error('AI deepen error:', error)
    res.status(200).json({
      deepened: 'AI 服务暂时不可用，请稍后再试。',
    })
  }
}
