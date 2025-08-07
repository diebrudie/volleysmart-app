import { PropsWithChildren } from "react";
import { Link } from "react-router-dom";
import Logo from "@/components/common/Logo";

const AuthLayout = ({ children }: PropsWithChildren) => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Logo size="lg" linkTo="/" />
        </div>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Create balanced volleyball teams with ease
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">{children}</div>
    </div>
  );
};

export default AuthLayout;
