import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './screens/Home';
import { InfiniteScrollDemo } from './screens/InfiniteScrollDemo';
import { BidirectionalScrollDemo } from './screens/BidirectionalScrollDemo';

export const App = () => (
  <Routes>
    <Route element={<Layout />}>
      <Route index element={<Home />} />
      <Route path="infinite-scroll" element={<InfiniteScrollDemo />} />
      <Route
        path="bidirectional-scroll"
        element={<BidirectionalScrollDemo />}
      />
    </Route>
  </Routes>
);
