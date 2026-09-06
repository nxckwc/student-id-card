import HeroSection from "./components/HeroSection";
import LoginCard from "./components/LoginCard";

const Background = () => (
  <div className="pointer-events-none absolute inset-0">
    <div className="login-grid absolute inset-0 opacity-70" />
  </div>
);

export default function LoginPage() {
  return (
    <main className="relative flex h-screen flex-1 overflow-hidden bg-background px-4 pb-4 pt-20 text-text-primary sm:px-6">
      <Background />
      <div className="relative mx-auto flex w-full max-w-6xl items-center">
        <div className="grid w-full items-center gap-12 lg:grid-cols-[1fr_28rem] lg:gap-20">
          <HeroSection />
          <LoginCard />
        </div>
      </div>
    </main>
  );
}