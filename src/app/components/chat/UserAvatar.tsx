import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
    name: string;
    isActive?: boolean;
}

export const UserAvatar = ({ name, isActive = false }: UserAvatarProps) => {
    return (
        <div className="relative">
            <Avatar className={cn(isActive && 'ring-2 ring-primary ring-offset-2 ring-offset-background')}>
                <AvatarFallback className={cn(
                    isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                )}>
                    {name.charAt(0)}
                </AvatarFallback>
            </Avatar>
        </div>
    );
};
