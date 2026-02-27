type LoadingStateProps = {
  text?: string;
};

export default function LoadingState({ text = "Generating..." }: LoadingStateProps) {
  return (
    <div className="flex items-center gap-3 text-zinc-300">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-500 border-t-zinc-100" />
      <p>{text}</p>
    </div>
  );
}
