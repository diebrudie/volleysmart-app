
import { PropsWithChildren } from "react";
import { Volleyball } from "lucide-react";
import { Link } from "react-router-dom";

const AuthLayout = ({ children }: PropsWithChildren) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Link to="/" className="flex items-center">
            <Volleyball className="h-10 w-10 text-volleyball-primary" />
            <span className="ml-2 text-2xl font-bold text-gray-900">VolleyTeam</span>
          </Link>
        </div>
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
