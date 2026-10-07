import { Routes, Route, useNavigate } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/footer/Footer";
import Home from "./pages/Home";
import About from "./pages/About";
import Programs from "./pages/Programs";
import News from "./pages/News";
import Gallery from "./pages/Gallery";
import Contact from "./pages/Contact";
import Stream from "./pages/Stream";
import Landing from "./pages/Landing";
import Search from "./pages/Search";
import Post from "./pages/Post";
import PostList from "./pages/Postlist";
import PageLoader from "./components/ui/PageLoader";

export default function App() {
  const navigate = useNavigate();

  return (
    <>
      <Header onListenLive={() => navigate("/stream")} />
      <main className="mx-auto max-w-[1244px] bg-[#111] p-6">
        <PageLoader>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/homepage" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/programs" element={<Programs />} />
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