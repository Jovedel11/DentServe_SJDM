import { Suspense } from "react";
import Loader from "./Loader";

const withSuspense = (Component) => {
  return (
    <Suspense
      fallback={<Loader type="spinner" size="large" message="Loading..." />}
    >
      <Component />
    </Suspense>
  );
};

export default withSuspense;
