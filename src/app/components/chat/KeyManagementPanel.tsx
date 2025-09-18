"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { CryptoLog, UserKeys } from "@/lib/types";
import { KeyRound, Lock, ShieldCheck, Users, BotMessageSquare } from "lucide-react";
import { UserAvatar } from "./UserAvatar";

interface KeyManagementPanelProps {
  users: Record<string, UserKeys>;
  logs: CryptoLog[];
  onGenerateKeys: (userName: 'Alice' | 'Bob') => void;
  onKeyExchange: () => void;
}

const KeyDisplay = ({ name, user }: { name: string; user: UserKeys }) => (
  <div className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50">
    <UserAvatar name={name} />
    <div className="flex-1 text-sm">
      <p className="font-medium">{name}</p>
      {user.keys ? (
        <div className="flex items-center gap-2 text-green-600">
          <ShieldCheck className="w-4 h-4" />
          <span className="text-muted-foreground">Keys Generated</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Lock className="w-4 h-4" />
          <span>No Keys</span>
        </div>
      )}
       {user.sessionKey && (
        <div className="flex items-center gap-2 text-blue-600 mt-1">
          <KeyRound className="w-4 h-4" />
          <span className="text-muted-foreground">Session Active</span>
        </div>
      )}
    </div>
    {!user.keys && (
      <Button size="sm" onClick={() => onGenerateKeys(name as 'Alice' | 'Bob')}>Generate</Button>
    )}
  </div>
);

export function KeyManagementPanel({ users, logs, onGenerateKeys, onKeyExchange }: KeyManagementPanelProps) {
  const { Alice, Bob } = users;
  const canExchange = Alice.keys && Bob.keys;
  const sessionActive = Alice.sessionKey && Bob.sessionKey;

  return (
    <div className="flex flex-col h-full bg-secondary/30 dark:bg-card">
      <div className="p-4 border-b">
        <h2 className="text-xl font-semibold tracking-tight">Crypto Dashboard</h2>
        <p className="text-sm text-muted-foreground">Visualize the end-to-end encryption process.</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><Users className="w-5 h-5" /> User Keys</CardTitle>
              <CardDescription>Generate RSA key pairs for each user to begin.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <KeyDisplay name="Alice" user={Alice} onGenerateKeys={onGenerateKeys} />
              <KeyDisplay name="Bob" user={Bob} onGenerateKeys={onGenerateKeys} />
            </CardContent>
          </Card>
          
          <div className="text-center">
            <Button onClick={onKeyExchange} disabled={!canExchange || sessionActive} className="w-full">
              <KeyRound className="mr-2 h-4 w-4" />
              {sessionActive ? 'Session Key Established' : 'Perform Key Exchange'}
            </Button>
            {!canExchange && <p className="text-xs text-muted-foreground mt-2">Both users must generate keys to exchange.</p>}
          </div>

          <Separator />
          
          <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg"><BotMessageSquare className="w-5 h-5"/> Crypto Operations Log</CardTitle>
              <CardDescription>A real-time log of all cryptographic actions.</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64 w-full rounded-md border p-3 bg-muted/20">
                <div className="text-xs font-mono space-y-2">
                  {logs.map((log) => (
                    <p key={log.id} className="leading-relaxed">
                      <span className="text-muted-foreground mr-2">&gt;</span>{log.entry}
                    </p>
                  ))}
                   {logs.length === 0 && <p className="text-muted-foreground">No operations yet. Generate keys to start.</p>}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
