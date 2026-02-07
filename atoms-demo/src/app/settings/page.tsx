'use client'

import { useState, useEffect, useTransition } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { getUserMcpConfig, updateUserMcpConfig } from '@/lib/actions/user'
import { Loader2 } from 'lucide-react'

export default function SettingsPage() {
    const [config, setConfig] = useState('')
    const [loading, setLoading] = useState(true)
    const [isPending, startTransition] = useTransition()

    useEffect(() => {
        async function loadConfig() {
            try {
                const data = await getUserMcpConfig()
                setConfig(data)
            } catch (error) {
                console.error('Failed to load config:', error)
                toast.error('Failed to load settings')
            } finally {
                setLoading(false)
            }
        }
        loadConfig()
    }, [])

    const handleSave = () => {
        startTransition(async () => {
            try {
                await updateUserMcpConfig(config)
                toast.success('Settings saved successfully')
            } catch (error) {
                console.error('Failed to save config:', error)
                toast.error('Failed to save settings')
            }
        })
    }

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="container mx-auto max-w-2xl py-10 px-4">
            <div className="rounded-xl border bg-card text-card-foreground shadow">
                <div className="flex flex-col space-y-1.5 p-6">
                    <h3 className="text-2xl font-semibold leading-none tracking-tight">User Settings</h3>
                    <p className="text-sm text-muted-foreground">
                        Configure your AI assistant preferences and MCP protocol settings.
                    </p>
                </div>
                <div className="p-6 pt-0 space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="mcp-config" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">MCP Configuration (System Prompt Injection)</label>
                        <Textarea
                            id="mcp-config"
                            placeholder="Enter your custom instructions or MCP protocol here..."
                            className="min-h-[200px] font-mono text-sm"
                            value={config}
                            onChange={(e) => setConfig(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            This text will be injected into the system prompt for every new chat session.
                        </p>
                    </div>
                </div>
                <div className="flex items-center p-6 pt-0 justify-end">
                    <Button onClick={handleSave} disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </div>
            </div>
        </div>
    )
}
