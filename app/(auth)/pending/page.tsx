export default function PendingPage() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-sm p-8 bg-white rounded-xl shadow text-center space-y-3">
        <h1 className="text-xl font-bold">Account pending</h1>
        <p className="text-sm text-gray-500">
          Your account has been created but hasn&apos;t been assigned a role yet.
          Contact a system administrator to get access.
        </p>
      </div>
    </main>
  )
}
