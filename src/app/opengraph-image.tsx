import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'Checkers'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
    return new ImageResponse(
        (
            <div
                style={{
                    height: '100%',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'white',
                }}
            >
                <img src="/og.png" alt="Checkers" style={{ width: '100%', height: '100%' }} />
            </div>
        ),
        {
            ...size,
        }
    )
} å