import React from "react";

const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  variant = "default",
  size = "default",
  className = "",
}) => {
  const variants = {
    default: "bg-background",
    card: "bg-card rounded-xl border shadow-sm p-8",
    glass: "glass-effect rounded-xl border shadow-lg p-8",
  };

  const sizes = {
    small: {
      container: "py-8",
      icon: "w-12 h-12",
      title: "text-lg",
      description: "text-sm",
    },
    default: {
      container: "py-16",
      icon: "w-16 h-16",
      title: "text-2xl",
      description: "text-base",
    },
    large: {
      container: "py-24",
      icon: "w-20 h-20",
      title: "text-3xl",
      description: "text-lg",
    },
  };

  const sizeConfig = sizes[size];

  return (
    <div
      className={`text-center ${sizeConfig.container} ${variants[variant]} ${className}`}
    >
      {Icon && (
        <Icon
          className={`${sizeConfig.icon} text-muted-foreground mx-auto mb-4`}
        />
      )}
      <h3 className={`${sizeConfig.title} font-bold text-foreground mb-2`}>
        {title}
      </h3>
      <p
        className={`${sizeConfig.description} text-muted-foreground max-w-md mx-auto mb-6`}
      >
        {description}
      </p>
      {action && action}
    </div>
  );
};

export default EmptyState;

// System-Wide Usage Examples:

// 1. No Search Results
// <EmptyState
//   icon={Search}
//   title="No results found"
//   description="Try adjusting your search terms or filters."
//   action={<Button onClick={clearSearch}>Clear Search</Button>}
// />

// 2. No Appointments
// <EmptyState
//   icon={Calendar}
//   title="No Appointments"
//   description="You don't have any appointments scheduled."
//   action={<Button>Book Appointment</Button>}
//   variant="card"
// />

// 3. No Notifications
// <EmptyState
//   icon={Bell}
//   title="All caught up!"
//   description="You have no new notifications."
//   size="small"
// />

// 4. No Clinic Services
// <EmptyState
//   icon={Stethoscope}
//   title="No Services Available"
//   description="This clinic hasn't added services yet."
//   variant="glass"
// />

// 5. Empty Dashboard
// <EmptyState
//   icon={BarChart}
//   title="No Data Yet"
//   description="Start using the system to see analytics here."
//   size="large"
// />
