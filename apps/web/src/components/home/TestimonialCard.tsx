
const TestimonialCard = () => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h3 className="text-xl font-medium text-gray-900">What our users say</h3>
      <div className="mt-4 text-gray-600">
        <p className="italic">
          "This app has made organizing our weekly volleyball matches so much easier. The teams are always balanced and everyone gets to play positions they're comfortable with."
        </p>
        <div className="mt-3 flex items-center">
          <div className="flex-shrink-0">
            <div className="h-10 w-10 rounded-full bg-volleyball-secondary flex items-center justify-center text-volleyball-primary font-bold">
              JD
            </div>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900">John Doe</p>
            <p className="text-sm text-gray-500">Volleyball Club Captain</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestimonialCard;
