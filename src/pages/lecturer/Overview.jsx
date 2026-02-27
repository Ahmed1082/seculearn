import OverviewDashboard from "../shared/OverviewDashboard";

const Overview = () => {
  return (
    <OverviewDashboard
      coursesPath="/lecturer/courses"
      userFallbackName="lecturer"
    />
  );
};

export default Overview;
