import OverviewDashboard from "../shared/OverviewDashboard";

const Overview = () => {
  return (
    <OverviewDashboard
      coursesPath="/instructor/courses"
      userFallbackName="Instructor X"
    />
  );
};

export default Overview;
