import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import Navbar from "./app/public/components/Navbar";

function App() {
  return (
    <RouterProvider router={router}>
      <Navbar />
    </RouterProvider>
  );
}

export default App;
