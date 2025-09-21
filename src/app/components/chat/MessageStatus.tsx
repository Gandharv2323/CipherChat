"use client";
import type { MessageStatus } from "@/lib/types";
import { Check, CheckCheck, CircleDashed, KeyRound, Loader2, Send, Server, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageStatusProps {
    status: MessageStatus;
}

const steps = [
    { id: 'encrypting', label: 'Encrypting', icon: ShieldCheck },
    { id: 'sending', label: 'Sending', icon: Send },
    { id: 'sent', label: 'On Server', icon: Server },
    { id: 'delivered', label: 'Delivered', icon: Check },
    { id: 'decrypting', label: 'Decrypting', icon: KeyRound },
    { id: 'complete', label: 'Complete', icon: CheckCheck },
];

export function MessageStatus({ status }: MessageStatusProps) {
    const currentStepIndex = steps.findIndex(step => step.id === status.step);

    return (
        <div className="mt-2 p-2 rounded-lg bg-muted/50">
            <div className="flex items-center justify-between">
                {steps.map((step, index) => {
                    const isActive = index <= currentStepIndex;
                    const isCurrent = index === currentStepIndex;
                    const Icon = isCurrent && (status.step === 'encrypting' || status.step === 'sending' || status.step === 'decrypting') ? Loader2 : step.icon;

                    return (
                        <div key={step.id} className="flex-1 flex items-center justify-center relative">
                            <div className={cn(
                                "flex flex-col items-center gap-1 text-xs text-muted-foreground transition-colors",
                                isActive && "text-primary"
                            )}>
                                <div className={cn(
                                    "w-6 h-6 rounded-full flex items-center justify-center bg-secondary transition-colors",
                                    isActive && "bg-primary text-primary-foreground"
                                )}>
                                    <Icon className={cn("w-4 h-4", isCurrent && "animate-spin")} />
                                </div>
                                <span>{step.label}</span>
                            </div>
                            {index < steps.length - 1 && (
                                <div className={cn(
                                    "absolute top-3 left-1/2 w-full h-0.5 bg-secondary -translate-x-0",
                                    index < currentStepIndex && "bg-primary"
                                )}></div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
