import { NextRequest, NextResponse } from 'next/server'
import { ask } from '@/lib/ai/client'
import { routeToAI, ContentTask } from '@/lib/marketing/free-tier-router'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { task, negocio, producto, objetivo, tono, canal, audiencia, customPrompt } = body

    if (!task || !negocio || !producto) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const rec = routeToAI(task as ContentTask, { negocio, producto, objetivo, tono, canal, audiencia })

    // Para tareas de copy: generar el contenido con Groq
    // Para tareas de imagen/diseño: solo devolver el prompt y las instrucciones
    const isTextTask = task.startsWith('copy_') || task === 'hashtags' || task === 'carrusel_textos'

    let generatedContent: string | null = null

    if (isTextTask) {
      const promptToUse = customPrompt || rec.prompt
      generatedContent = await ask(
        `Sos un especialista en marketing digital para negocios gastronómicos premium en Argentina.
Respondé SOLO con el contenido pedido, sin explicaciones previas, sin "Aquí está" ni introducciones.
Empezá directo con el contenido.

${promptToUse}`
      )
    }

    return NextResponse.json({
      herramienta: rec.herramienta,
      url: rec.url,
      freeTier: rec.freeTier,
      limitacion: rec.limitacion,
      formato: rec.formato,
      prompt: rec.prompt,
      configuracion: rec.configuracion,
      alternativa: rec.alternativa,
      tips: rec.tips,
      contenido: generatedContent,  // null para imagen/diseño, texto para copy
    })
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error generando contenido' },
      { status: 500 }
    )
  }
}
