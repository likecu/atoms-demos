"use client"

import React, { useState, useEffect, useRef } from 'react'

const ConsoleLogger = () => {
    const [logs, setLogs] = useState<string[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [isMinimized, setIsMinimized] = useState(false)

    useEffect(() => {
        const originalLog = console.log
        const originalWarn = console.warn
        const originalError = console.error

        const handleLog = (type: string, args: any[]) => {
            const message = args.map(arg =>
                typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            ).join(' ')

            // Defer state update to avoid "Cannot update a component while rendering a different component"
            setTimeout(() => {
                setLogs(prev => [...prev, `[${type}] ${message}`].slice(-50))
            }, 0)
        }

        console.log = (...args) => {
            originalLog(...args)
            handleLog('LOG', args)
        }

        console.warn = (...args) => {
            originalWarn(...args)
            handleLog('WARN', args)
        }

        console.error = (...args) => {
            originalError(...args)
            handleLog('ERROR', args)
        }

        return () => {
            console.log = originalLog
            console.warn = originalWarn
            console.error = originalError
        }
    }, [])

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                style={{
                    position: 'fixed',
                    bottom: '20px',
                    right: '20px',
                    padding: '10px',
                    background: '#333',
                    color: '#fff',
                    borderRadius: '5px',
                    zIndex: 9999
                }}
            >
                Show Console
            </button>
        )
    }

    return (
        <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: isMinimized ? '40px' : '300px',
            background: '#1e1e1e',
            color: '#fff',
            zIndex: 9999,
            borderTop: '1px solid #333',
            fontFamily: 'monospace',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <div style={{
                padding: '10px',
                background: '#333',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <span>Debug Console ({logs.length})</span>
                <div>
                    <button onClick={() => setLogs([])} style={{ marginRight: '10px' }}>Clear</button>
                    <button onClick={() => setIsMinimized(!isMinimized)} style={{ marginRight: '10px' }}>
                        {isMinimized ? 'Expand' : 'Minimize'}
                    </button>
                    <button onClick={() => setIsOpen(false)}>Close</button>
                </div>
            </div>
            {!isMinimized && (
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '10px'
                }}>
                    {logs.map((log, i) => (
                        <div key={i} style={{
                            marginBottom: '4px',
                            color: log.includes('[ERROR]') ? '#ff6b6b' :
                                log.includes('[WARN]') ? '#feca57' : '#fff'
                        }}>
                            {log}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default ConsoleLogger
