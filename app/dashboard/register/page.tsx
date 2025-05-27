"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Icons } from "@/components/icons"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"

// Define extended user type to include role
interface ExtendedUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string;
  clientName?: string;
}

// Extend the Session type
interface ExtendedSession {
  user: ExtendedUser;
  expires: string;
}

export default function RegisterPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { toast } = useToast()
  
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    userId: "",
    password: "",
    clientName: ""
  })
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  
  // Use useEffect for navigation instead of doing it during render
  useEffect(() => {
    
    // Only redirect if we have a definitive status
    if (status === "authenticated") {
      const typedSession = session as ExtendedSession;
      
      if (typedSession?.user?.role !== "admin") {
        router.push("/dashboard");
      } else {
      }
    } else if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, session, router]);
  
  // Check if user is authenticated and is an admin
  if (status === "loading") {
    return <div className="flex h-screen items-center justify-center">
      <Icons.spinner className="h-10 w-10 animate-spin text-muted-foreground" />
    </div>
  }
  
  // Skip rendering if not authenticated
  if (status === "unauthenticated") {
    return null;
  }
  
  // Skip rendering if not admin
  const typedSession = session as ExtendedSession | null;
  if (typedSession?.user?.role !== "admin") {
    return null;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess("")

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Registration failed")
      }

      setSuccess("User registered successfully!")
      setFormData({
        name: "",
        userId: "",
        password: "",
        clientName: ""
      })
      
      toast({
        title: "Success",
        description: "User has been registered successfully",
        variant: "default",
      })
    } catch (error) {
      setError(error instanceof Error ? error.message : "Registration failed")
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Registration failed",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">User Registration</h2>
        <Button variant="outline" onClick={() => router.push("/dashboard")}>
          Back to Dashboard
        </Button>
      </div>
      
      <Separator />
      
      <div className="mx-auto max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Register New User</CardTitle>
            <CardDescription>
              Create access credentials for a client
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
              
              {success && (
                <Alert className="border-green-500 text-green-500">
                  <Icons.check className="h-4 w-4" />
                  <AlertTitle>Success</AlertTitle>
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="First Last"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="userId">User ID</Label>
                <Input 
                  id="userId" 
                  name="userId"
                  placeholder="user.name" 
                  required 
                  value={formData.userId}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  name="password"
                  type="password" 
                  required 
                  value={formData.password}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="clientName">Client Name</Label>
                <Input 
                  id="clientName" 
                  name="clientName"
                  placeholder="Company Name" 
                  required 
                  value={formData.clientName}
                  onChange={handleInputChange}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  "Register User"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
} 
