import TitleBar from './TitleBar';
import MenuBar from './MenuBar';
import Sidebar from './Sidebar';
import MDIWorkspace from '../mdi/MDIWorkspace';
import AppTaskbar from './AppTaskbar';
import DialogContainer from '../mdi/DialogContainer';

const Layout = () => {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden relative">
          <MenuBar />
          <MDIWorkspace />
        </div>
      </div>
      <AppTaskbar />
      <DialogContainer />
    </div>
  );
};

export default Layout;
