import { redirect } from "next/navigation";

export default function HomePage() {
  redirect("/swipe");
}
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-pink-400 to-purple-600 text-white">
      <h1 className="text-5xl font-bold mb-4">Buzz Me 🐝</h1>

      <p className="text-lg mb-8 text-center max-w-md">
        Meet. Match. Chat.  
        Made for teens who are tired of boring apps.
      </p>

      <div className="flex gap-4">
        <a
          href="/signup"
          className="bg-white text-purple-600 px-6 py-3 rounded-full font-semibold"
        >
          Get Started
        </a>

        <a
          href="/login"
          className="border border-white px-6 py-3 rounded-full font-semibold"
        >
          Login
        </a>
      </div>
    </main>
