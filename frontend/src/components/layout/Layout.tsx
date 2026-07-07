import TitleBar from './TitleBar';
import MenuBar from './MenuBar';
import ModuleBar from './ModuleBar';
import MDIWorkspace from '../mdi/MDIWorkspace';
import AppTaskbar from './AppTaskbar';
import DialogContainer from '../mdi/DialogContainer';

const Layout = () => {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <TitleBar />
      <MenuBar />
      <ModuleBar />
      <MDIWorkspace />
      <AppTaskbar />
      <DialogContainer />
    </div>
  );
};

export default Layout;
