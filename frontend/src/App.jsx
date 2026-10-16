import { lazy, Suspense } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/footer/Footer";
import Home from "./pages/Home";
import About from "./pages/About";
import Programs from "./pages/Programs";
import ProgramCategory from "./pages/ProgramCategory";
import News from "./pages/News";
import Gallery from "./pages/Gallery";
import Contact from "./pages/Contact";
import Stream from "./pages/Stream";
import Landing from "./pages/Landing";
import Search from "./pages/Search";
import Post from "./pages/Post";
import PostList from "./pages/Postlist";
import PageLoader from "./components/ui/PageLoader";

// Loaded only when someone opens /admin, so visitors never download it
const AdminApp = lazy(() => import("./admin/AdminApp"));

// The public website (your old App, unchanged)
function PublicSite() {
  const navigate = useNavigate();

  return (
    <>
      <Header onListenLive={() => navigate("/stream")} />
      <main className="mx-auto w-full max-w-[1244px] bg-[#111] px-3 py-4 sm:px-6 sm:py-6">
        <PageLoader>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/homepage" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/programs" element={<Programs />} />
            <Route path="/programs/:slug" element={<ProgramCategory />}/>
            <Route path="/news" element={<News />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/stream" element={<Stream />} />
            <Route path="/search" element={<Search />} />
            <Route path="/category/:slug" element={<PostList />} />
            <Route path="/archive/:month" element={<PostList />} />
            <Route path="/:slug" element={<Post />} />
          </Routes>
        </PageLoader>
      </main>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <Routes>
      {/* /admin has no public Header or Footer */}
      <Route path="/admin/*" element={<Suspense fallback={null}><AdminApp /></Suspense>} />
      <Route path="*" element={<PublicSite />} />
    </Routes>
  );
}