
interface StarProps {
  filled: boolean;
  small?: boolean;
}

export const Star = ({ filled, small = false }: StarProps) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${
        small ? 'h-3 w-3' : 'h-4 w-4'
      } ${
        filled ? 'text-yellow-400' : 'text-gray-300'
      }`}
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </svg>
  );
};
