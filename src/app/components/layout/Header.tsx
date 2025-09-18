import { ShieldHalf } from 'lucide-react';

export default function Header() {
  return (
    <header className="border-b bg-card">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldHalf className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              CipherChat
            </h1>
          </div>
          <p className="text-sm text-muted-foreground hidden md:block">
            A visual guide to End-to-End Encryption
          </p>
        </div>
      </div>
    </header>
  );
}
