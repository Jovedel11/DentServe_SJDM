import ScrollReveal from "../common/react_bits/ScrollReveal";

const withScrollReveal = (WrappedComponent) => {
  return (props) => {
    return (
      <ScrollReveal>
        <WrappedComponent {...props} />
      </ScrollReveal>
    );
  };
};

export default withScrollReveal;
