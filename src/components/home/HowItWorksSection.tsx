
const HowItWorksSection = () => {
  const steps = [
    {
      number: 1,
      title: "Register Your Players",
      description: "Add your players and their preferred positions to the system."
    },
    {
      number: 2,
      title: "Generate Balanced Teams",
      description: "Select which players are available and let our algorithm create fair teams."
    },
    {
      number: 3,
      title: "Track Match Results",
      description: "Record game scores and keep a history of all matches played."
    }
  ];

  return (
    <section id="about" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            How It Works
          </h2>
          <p className="mt-4 text-lg text-gray-500 max-w-3xl mx-auto">
            Simple steps to get your volleyball team organized
          </p>
        </div>

        <div className="mt-16 max-w-4xl mx-auto">
          <ul className="space-y-10">
            {steps.map((step) => (
              <StepItem 
                key={step.number}
                number={step.number} 
                title={step.title} 
                description={step.description} 
              />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

interface StepItemProps {
  number: number;
  title: string;
  description: string;
}

const StepItem = ({ number, title, description }: StepItemProps) => {
  return (
    <li className="flex">
      <div className="flex-shrink-0">
        <div className="flex items-center justify-center h-12 w-12 rounded-md bg-volleyball-primary text-white text-xl font-bold">
          {number}
        </div>
      </div>
      <div className="ml-4">
        <h3 className="text-xl font-medium text-gray-900">{title}</h3>
        <p className="mt-2 text-gray-500">{description}</p>
      </div>
    </li>
  );
};

export default HowItWorksSection;
