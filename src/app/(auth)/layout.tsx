export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full items-center justify-center bg-[#101012]">
      <div className="w-full max-w-md p-8">{children}</div>
    </div>
  );
}
