import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/footer/Footer";
import Landing from "./pages/Landing";
import Post from "./pages/Post";
import PageLoader from "./components/ui/PageLoader";

export default function App() {
  return (
    <>
      <Header onListenLive={() => {}} />
      <main className="mx-auto max-w-[1244px] bg-[#111] p-6">
        <PageLoader>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/:slug" element={<Post />} />
          </Routes>
        </PageLoader>
      </main>
      <Footer />
    </>
  );
}