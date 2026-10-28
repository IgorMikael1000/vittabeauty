import type { ReactNode } from "react";

export default function AuthActionLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-12 sm:px-6">
      <div
        aria-hidden="true"
        className="absolute left-[-10rem] top-[-12rem] h-[28rem] w-[28rem] rounded-full bg-[#e8d8ef]/55 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute bottom-[-12rem] right-[-8rem] h-[26rem] w-[26rem] rounded-full bg-[#f0d9e7]/60 blur-3xl"
      />
      <div className="relative z-10 w-full">{children}</div>
    </div>
  );
}
