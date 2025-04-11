
import { PropsWithChildren } from "react";
import { Link } from "react-router-dom";

const AuthLayout = ({ children }: PropsWithChildren) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Link to="/" className="flex items-center">
            <img 
              src="/lovable-uploads/e54f46fd-5eab-4f09-94df-48c27897b119.png" 
              alt="VolleyMatch Logo" 
              className="h-12" 
            />
          </Link>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          VolleyMatch
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Create balanced volleyball teams with ease
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
