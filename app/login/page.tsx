"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Icons } from "@/components/icons"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Eye, EyeOff } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const approved = searchParams.get('approved')
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>("")
  const [formData, setFormData] = useState({
    username: "",
    password: ""
  })

  // Toggle between sign in and sign up
  const [mode, setMode] = useState<"signin" | "signup">("signin")
  // Sign-up form state
  const [signUpData, setSignUpData] = useState({ name: "", company: "", category: "", email: "", password: "", confirmPassword: "" })
  // Password visibility toggles
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Show approval status toast
  useEffect(() => {
    if (approved === 'success') {
      toast({ title: 'Approved', description: 'Your account is now active. Please sign in.', variant: 'default' })
    } else if (approved === 'already') {
      toast({ title: 'Already Approved', description: 'This request was already approved.', variant: 'default' })
    } else if (approved === 'invalid') {
      toast({ title: 'Invalid Link', description: 'This approval link is invalid or expired.', variant: 'destructive' })
    } else if (approved === 'error') {
      toast({ title: 'Error', description: 'Something went wrong. Please try again.', variant: 'destructive' })
    }
  }, [approved, toast])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setFormData(prev => ({ ...prev, [id]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const result = await signIn("credentials", {
        redirect: false,
        username: formData.username,
        password: formData.password
      })

      if (result?.error) {
        setError("Invalid username or password")
        setIsLoading(false)
        return
      }

      // Successful login
      router.push("/dashboard")
      router.refresh() // Refresh to update session state
    } catch (error) {
      console.error("Login error:", error)
      setError("An error occurred. Please try again.")
      setIsLoading(false)
    }
  }

  // Handle sign-up input change
  const handleSignUpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setSignUpData(prev => ({ ...prev, [name]: value }))
  }

  // Handle sign-up form submission
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (signUpData.password !== signUpData.confirmPassword) {
      setError("Passwords do not match")
      return
    }
    setIsLoading(true)
    setError("")
    try {
      const res = await fetch("/api/request-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signUpData),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Request failed")
      }
      alert("Request sent! We will notify you when approved.")
      // Reset sign-up form
      setSignUpData({ name: "", company: "", category: "", email: "", password: "", confirmPassword: "" })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-pinsight-dark p-4">
      <Card className="w-full max-w-md border-pinsight-orange/20">
        {/* Tab switcher */}
        <div className="flex justify-center mt-4 space-x-4">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={cn(
              "px-4 py-2 font-medium",
              mode === "signin"
                ? "border-b-2 border-pinsight-orange text-pinsight-orange"
                : "text-muted-foreground"
            )}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={cn(
              "px-4 py-2 font-medium",
              mode === "signup"
                ? "border-b-2 border-pinsight-orange text-pinsight-orange"
                : "text-muted-foreground"
            )}
          >
            Sign Up
          </button>
        </div>
        {mode === "signin" ? (
          <> 
            {/* Existing Sign-In Header */}
            <CardHeader className="space-y-1 text-center">
              <div className="flex justify-center mb-4">
                <Icons.logo className="h-12 w-12 text-pinsight-orange" />
              </div>
              <CardTitle className="text-2xl font-bold">Pinsight Analytics</CardTitle>
              <CardDescription className="text-muted-foreground">
                Enter your credentials to access the dashboard
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <Icons.alertTriangle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="username">Email</Label>
                  <Input 
                    id="username" 
                    placeholder="Enter here" 
                    required 
                    value={formData.username}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2 relative">
                  <Label htmlFor="password">Password</Label>
                  <Input 
                    id="password" 
                    placeholder="Enter here"
                    required 
                    type={showPassword ? "text" : "password"} 
                    value={formData.password}
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute inset-y-0 right-3 flex items-center text-muted-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <div className="flex justify-end">
                  <Link href="/forgot-password" className="text-sm text-pinsight-orange hover:underline">
                    Forgot Password?
                  </Link>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full bg-pinsight-orange hover:bg-pinsight-orange/90" type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </CardFooter>
            </form>
          </>
        ) : (
          <> 
            {/* Sign-Up Header */}
            <CardHeader className="space-y-1 text-center">
              <div className="flex justify-center mb-4">
                <Icons.logo className="h-12 w-12 text-pinsight-orange" />
              </div>
              <CardTitle className="text-2xl font-bold">Request Access</CardTitle>
              <CardDescription className="text-muted-foreground">
                Fill out the form to request access. We'll notify you when approved.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSignUpSubmit}>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <Icons.alertTriangle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Full Name"
                    required
                    value={signUpData.name}
                    onChange={handleSignUpChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    name="company"
                    placeholder="Company Name"
                    required
                    value={signUpData.company}
                    onChange={handleSignUpChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category/Product</Label>
                  <Input
                    id="category"
                    name="category"
                    placeholder="Category or Product"
                    required
                    value={signUpData.category}
                    onChange={handleSignUpChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    value={signUpData.email}
                    onChange={handleSignUpChange}
                  />
                </div>
                <div className="space-y-2 relative">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={signUpData.password}
                    onChange={handleSignUpChange}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute inset-y-0 right-3 flex items-center text-muted-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <div className="space-y-2 relative">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={signUpData.confirmPassword}
                    onChange={handleSignUpChange}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(v => !v)}
                    className="absolute inset-y-0 right-3 flex items-center text-muted-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full bg-pinsight-orange hover:bg-pinsight-orange/90"
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />Requesting...
                    </>
                  ) : (
                    "Request Access"
                  )}
                </Button>
              </CardFooter>
            </form>
          </>
        )}
      </Card>
    </div>
  )
}
