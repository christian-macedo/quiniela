import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="container mx-auto py-16 px-4 text-center">
      <ShieldAlert className="h-16 w-16 mx-auto mb-4 text-destructive" />
      <h1 className="text-4xl font-bold mb-4">Access Denied</h1>
      <p className="text-xl text-muted-foreground mb-8">
        You don&apos;t have permission to access this page. Administrator privileges are required.
      </p>
      <Link href="/tournaments">
        <Button>Return to Tournaments</Button>
      </Link>
    </div>
  );
}
