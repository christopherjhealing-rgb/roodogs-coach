export default function Empty({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="card-dark text-center py-10">
      <p className="display text-2xl mb-2">{title}</p>
      {body && <p className="text-mint/70 max-w-sm mx-auto mb-4">{body}</p>}
      {action}
    </div>
  );
}
