import { SignUpPage, Testimonial } from "@/components/ui/sign-up";

const sampleTestimonials: Testimonial[] = [
  {
    avatarSrc: "https://randomuser.me/api/portraits/women/44.jpg",
    name: "Emma Rodriguez",
    handle: "@emmacodes",
    text: "This platform changed how I manage my projects. The interface is intuitive and the features are powerful."
  },
  {
    avatarSrc: "https://randomuser.me/api/portraits/men/86.jpg",
    name: "Alex Thompson",
    handle: "@alexdesigns",
    text: "Amazing experience from day one. The onboarding was smooth and the support team is incredibly responsive."
  },
  {
    avatarSrc: "https://randomuser.me/api/portraits/women/12.jpg",
    name: "Sophie Chen",
    handle: "@sophietech",
    text: "I've been using this for months now. It's reliable, fast, and has everything I need for my daily workflow."
  },
];

const SignUpPageDemo = () => {
  const handleSignUp = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const data = Object.fromEntries(formData.entries());
    console.log("Sign Up submitted:", data);
    alert(`Sign Up Submitted! Check the browser console for form data.`);
  };

  const handleGoogleSignUp = () => {
    console.log("Continue with Google clicked");
    alert("Continue with Google clicked");
  };
  
  const handleSignIn = () => {
    alert("Sign In clicked");
  }

  return (
    <div className="bg-background text-foreground">
      <SignUpPage
        heroImageSrc="https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=2160&q=80"
        testimonials={sampleTestimonials}
        onSignUp={handleSignUp}
        onGoogleSignUp={handleGoogleSignUp}
        onSignIn={handleSignIn}
      />
    </div>
  );
};

export default SignUpPageDemo;
