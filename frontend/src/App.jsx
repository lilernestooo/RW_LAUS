import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/footer/Footer";
import Home from "./pages/Home";
import About from "./pages/About";
import Landing from "./pages/Landing";
import Search from "./pages/Search";
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
            <Route path="/homepage" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/search" element={<Search />} />
            <Route path="/:slug" element={<Post />} />
          </Routes>
        </PageLoader>
      </main>
      <Footer />
    </>
  );
}