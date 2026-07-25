export default function SignUpLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#FAFAFA]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-[3px] border-[#002FA7] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-[#525252]">Loading...</p>
      </div>
    </div>
  );
}
