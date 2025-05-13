"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icons } from "@/components/icons";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Define extended user type to include role
interface ExtendedUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string;
  clientName?: string;
}

export default function SetClientPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  
  const [userId, setUserId] = useState('');
  const [clientName, setClientName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  // Use useEffect for navigation
  useEffect(() => {
    if (status === "authenticated") {
      const user = session?.user as ExtendedUser;
      
      if (user?.role !== "admin") {
        console.log("Redirecting to dashboard - not admin");
        router.push("/dashboard");
      }
    } else if (status === "unauthenticated") {
      console.log("Redirecting to login - unauthenticated");
      router.push("/login");
    }
  }, [status, session, router]);
  
  if (status === "loading") {
    return <div className="flex h-screen items-center justify-center">
      <Icons.spinner className="h-10 w-10 animate-spin text-muted-foreground" />
    </div>;
  }
  
  // Skip rendering if not authenticated or not admin
  const user = session?.user as ExtendedUser;
  if (!session || user?.role !== "admin") {
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch('/api/set-client', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, clientName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to set client');
      }

      setMessage(data.message);
      // Clear form after success
      setUserId('');
      setClientName('');
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Set User's Client</h2>
        <Button variant="outline" onClick={() => router.push("/dashboard")}>
          Back to Dashboard
        </Button>
      </div>
      
      <Separator />
      
      <div className="mx-auto max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Assign Client to User</CardTitle>
            <CardDescription>
              Set which client's data a user can access
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <Icons.alertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              {message && (
                <Alert className="border-green-500 text-green-500">
                  <Icons.check className="h-4 w-4" />
                  <AlertTitle>Success</AlertTitle>
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="userId">User ID</Label>
                <Input 
                  id="userId" 
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="Enter user ID" 
                  required 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="clientName">Client Name</Label>
                <Input 
                  id="clientName" 
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Enter client name" 
                  required 
                />
                <p className="text-sm text-muted-foreground">
                  This should match exactly with the client name in your data
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Set Client for User"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
} 