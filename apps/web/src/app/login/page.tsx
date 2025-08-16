"use client"

import { SignInPage } from "@/components/ui/sign-in";
import { SignUpPage } from "@/components/ui/sign-up";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Loader from "@/components/loader";
import React, { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [showSignUp, setShowSignUp] = useState(false);

  // Redirect to dashboard if user is already logged in
  React.useEffect(() => {
    if (!isPending && session) {
      router.push("/dashboard");
    }
  }, [session, isPending, router]);

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    await authClient.signIn.email(
      {
        email,
        password,
      },
      {
        onSuccess: () => {
          router.push("/dashboard");
          toast.success("Sign in successful");
        },
        onError: (error) => {
          toast.error(error.error.message || error.error.statusText);
        },
      },
    );
  };

  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const terms = formData.get("terms");

    if (!name || !email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    if (!terms) {
      toast.error("Please accept the terms and conditions");
      return;
    }

    await authClient.signUp.email(
      {
        name,
        email,
        password,
      },
      {
        onSuccess: () => {
          router.push("/dashboard");
          toast.success("Account created successfully");
        },
        onError: (error) => {
          toast.error(error.error.message || error.error.statusText);
        },
      },
    );
  };

  const handleGoogleSignIn = async () => {
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/dashboard",
      });
    } catch (error) {
      console.error("Google sign-in error:", error);
      toast.error("Failed to sign in with Google");
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/dashboard",
      });
    } catch (error) {
      console.error("Google sign-up error:", error);
      toast.error("Failed to sign up with Google");
    }
  };

  const handleResetPassword = () => {
    toast.info("Password reset functionality coming soon");
  };

  const handleCreateAccount = () => {
    setShowSignUp(true);
  };

  const handleBackToSignIn = () => {
    setShowSignUp(false);
  };

  // Show loader while checking session or if user is logged in (redirecting)
  if (isPending || session) {
    return <Loader />;
  }

  if (showSignUp) {
    return (
      <SignUpPage
        title={<span className="font-light text-foreground tracking-tighter">Join Us</span>}
        description="Create your account and start your journey with us"
        heroImageSrc="https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=2160&q=80"
        onSignUp={handleSignUp}
        onGoogleSignUp={handleGoogleSignUp}
        onSignIn={handleBackToSignIn}
      />
    );
  }

  return (
    <SignInPage
      title={<span className="font-light text-foreground tracking-tighter">Welcome Back</span>}
      description="Sign in to access your account and continue your journey"
      heroImageSrc="https://images.unsplash.com/photo-1642615835477-d303d7dc9ee9?w=2160&q=80"
      onSignIn={handleSignIn}
      onGoogleSignIn={handleGoogleSignIn}
      onResetPassword={handleResetPassword}
      onCreateAccount={handleCreateAccount}
    />
  );
}
